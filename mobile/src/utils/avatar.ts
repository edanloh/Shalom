export type AnyUser = Record<string, any>;

const toHttps = (u?: string | null) =>
  u && u.startsWith('http://') ? u.replace('http://', 'https://') : u;

export function getAvatarUri(user?: AnyUser | null): string | null {
  if (!user) return null;

  const candidates: Array<[string, string | undefined]> = [
    ['avatarUrl', user.avatarUrl],
    ['photoURL', user.photoURL],
    ['avatar', user.avatar],
    ['imageUrl', user.imageUrl],
    ['profileImageUrl', user.profileImageUrl],
    ['picture', user.picture],
    ['profile.avatarUrl', user?.profile?.avatarUrl],
    ['attributes.picture', user?.attributes?.picture],
    ['attributes.custom:avatarUrl', user?.attributes?.['custom:avatarUrl']],
    ['user_metadata.avatar_url', user?.user_metadata?.avatar_url],
  ];

  const first = candidates.find(([, v]) => !!v)?.[1] ?? null;
  const sanitized = first && first.startsWith('http://') ? first.replace('http://', 'https://') : first;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('getAvatarUri debug →', {
      pickedKey: candidates.find(([, v]) => !!v)?.[0] ?? null,
      pickedValue: first,
      sanitized,
      userKeys: Object.keys(user || {}),
    });
  }

  return sanitized ?? null;
}
