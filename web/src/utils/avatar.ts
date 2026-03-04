import profile from '@/assets/profile.png';

export const getAvatarUri = (avatar_url?: string) => {
  const uri = avatar_url
    ? `https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/${avatar_url}`
    : profile;
  return uri.toString();
};
