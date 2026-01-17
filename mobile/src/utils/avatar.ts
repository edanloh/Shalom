import { useUser } from "@/contexts/UserContext";
import { Images } from "@assets/index";

export const getAvatarUri = () => {
  const data = useUser().user;
  const uri = data?.avatar_url
    ? `https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/${data.avatar_url}`
    : Images.profile;
  return uri;
};
