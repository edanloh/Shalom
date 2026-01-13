import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

const cognitoClient = new CognitoIdentityProviderClient({
  region: "ap-southeast-1",
});

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-southeast-1"
});

const USER_POOL_ID = "ap-southeast-1_u14Yx8fJ9";

let cachedSecret = null;

async function getDbCredentials() {
  if (cachedSecret) return cachedSecret;
  const command = new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_NAME });
  const response = await secretsClient.send(command);
  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  let dbClient;

  try {
    const body = JSON.parse(event.body || "{}");
    const { email, enabled } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    if (typeof enabled !== "boolean") {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "enabled field must be a boolean (true or false)",
        }),
      };
    }

    if (!USER_POOL_ID) {
      throw new Error("COGNITO_USER_POOL_ID environment variable is not set");
    }

    // 🔍 Step 1: Find username by email in Cognito
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    });

    const listResponse = await cognitoClient.send(listCommand);
    const user = listResponse.Users?.[0];

    if (!user) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `User with email ${email} not found` }),
      };
    }

    const username = user.Username;
    console.log(`Found username: ${username} for email: ${email}`);

    // 🔧 Step 2: Enable or disable user in Cognito
    const command = enabled
      ? new AdminEnableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        })
      : new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        });

    await cognitoClient.send(command);

    const action = enabled ? "enabled" : "disabled";
    console.log(`Successfully ${action} user in Cognito: ${username}`);

    // 🗄️ Step 3: Update database
    const secret = await getDbCredentials();
    
    const connectionConfig = {
      host: secret.host?.trim(),
      port: parseInt(secret.port) || 6543,
      user: secret.username?.trim(),
      password: secret.password,
      database: secret.dbname || "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      family: 4 // Force IPv4
    };
    
    dbClient = new Client(connectionConfig);
    await dbClient.connect();

    // Update the is_active field in the users table
    const updateQuery = `
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE email = $2
      RETURNING id, email, is_active
    `;
    
    const updateResult = await dbClient.query(updateQuery, [enabled, email]);
    
    if (updateResult.rowCount === 0) {
      console.warn(`User ${email} updated in Cognito but not found in database`);
    } else {
      console.log(`Successfully updated database for user: ${email}`, updateResult.rows[0]);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: `User ${email} (${username}) has been ${action}`,
        email,
        username,
        enabled,
        databaseUpdated: updateResult.rowCount > 0,
      }),
    };
  } catch (error) {
    console.error("Error toggling user enabled status:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.name === "UserNotFoundException") {
      statusCode = 404;
      errorMessage = "User not found in Cognito";
    } else if (error.name === "NotAuthorizedException") {
      statusCode = 403;
      errorMessage = "Not authorized to perform this action";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: errorMessage,
        details: error.message,
      }),
    };
  } finally {
    if (dbClient) {
      await dbClient.end().catch(e => console.error("Error closing database connection:", e));
    }
  }
};
