export const validatePassword = (pwd: string) => {
  const rules = [
    { test: pwd.length >= 8, msg: "Password must be at least 8 characters" },
    {
      test: /[0-9]/.test(pwd),
      msg: "Password must contain at least 1 number",
    },
    {
      test: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      msg: "Password must contain at least 1 special character",
    },
    {
      test: /[A-Z]/.test(pwd),
      msg: "Password must contain at least 1 uppercase letter",
    },
    {
      test: /[a-z]/.test(pwd),
      msg: "Password must contain at least 1 lowercase letter",
    },
  ];
  return rules.find((r) => !r.test)?.msg || "";
};

// --- Deep linking and Supabase password reset flow ---
export const parseSupabaseUrl = (url: string) => {
  let parsedUrl = url;
  if (url.includes('#')) {
    parsedUrl = url.replace('#', '?');
  }
  return parsedUrl;
};