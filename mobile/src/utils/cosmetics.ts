import { Colors } from "@/constants";
import type { ShopItem } from "@/services/creditService";

export const bannerPaletteFor = (item?: Partial<Pick<ShopItem, "name" | "color">> | null): [string, string, string] => {
  const name = item?.name?.toLowerCase() ?? "";
  if (name.includes("sunset")) return ["#3B0764", "#FB7185", "#F97316"];
  if (name.includes("nebula")) return ["#111827", "#4F46E5", "#A855F7"];
  if (name.includes("ocean")) return ["#083344", "#0891B2", "#22D3EE"];
  return ["#312E81", item?.color ?? Colors.secondary, "#111827"];
};

export const frameStyleFor = (item?: Partial<Pick<ShopItem, "name" | "color">> | null) => {
  const name = item?.name?.toLowerCase() ?? "";
  if (name.includes("solar")) {
    return {
      outer: {
        borderColor: "#FDE68A",
        backgroundColor: "rgba(245,158,11,0.20)",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 12,
        elevation: 8,
      },
      inner: { borderColor: "#F59E0B", borderWidth: 3 },
      label: "radiant double ring",
    };
  }
  if (name.includes("royal")) {
    return {
      outer: {
        borderColor: "#C4B5FD",
        backgroundColor: "rgba(139,92,246,0.20)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 8,
        elevation: 6,
      },
      inner: { borderColor: "#8B5CF6", borderWidth: 4 },
      label: "thick royal border",
    };
  }
  if (name.includes("aurora")) {
    return {
      outer: {
        borderColor: "#86EFAC",
        backgroundColor: "rgba(74,222,128,0.18)",
        shadowColor: "#4ADE80",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 9,
        elevation: 5,
      },
      inner: { borderColor: "#4ADE80", borderWidth: 2 },
      label: "soft green glow",
    };
  }
  return {
    outer: {
      borderColor: item?.color ?? Colors.white,
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    inner: { borderColor: item?.color ?? Colors.white, borderWidth: 2 },
    label: "classic border",
  };
};

export const titleBadgeStyleFor = (item?: Partial<Pick<ShopItem, "rarity" | "color">> | null) => {
  const rarity = item?.rarity ?? "common";
  const color = item?.color ?? Colors.white;
  if (rarity === "legendary") {
    return {
      badge: {
        backgroundColor: "rgba(250,204,21,0.20)",
        borderColor: "#FACC15",
        borderWidth: 2,
        shadowColor: "#FACC15",
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
      },
      text: { color: "#FEF3C7" },
    };
  }
  if (rarity === "epic") {
    return {
      badge: {
        backgroundColor: "rgba(168,85,247,0.20)",
        borderColor: color,
        borderWidth: 2,
      },
      text: { color: "#F3E8FF" },
    };
  }
  return {
    badge: {
      backgroundColor: `${color}22`,
      borderColor: color,
      borderWidth: 1,
    },
    text: { color: Colors.textPrimary },
  };
};

export const showcaseStyleFor = (item?: Partial<Pick<ShopItem, "name" | "color">> | null) => {
  const name = item?.name?.toLowerCase() ?? "";
  const color = item?.color ?? Colors.yellow;
  if (name.includes("hall")) {
    return {
      container: {
        borderColor: "#EAB308",
        backgroundColor: "rgba(234,179,8,0.16)",
        shadowColor: "#EAB308",
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
      iconColor: "#FACC15",
    };
  }
  return {
    container: {
      borderColor: color,
      backgroundColor: `${color}22`,
      borderWidth: 1.5,
    },
    iconColor: color,
  };
};
