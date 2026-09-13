export const colors = {
  bg: "#F5F3FF",
  surface: "#FFFFFF",
  primary: "#6D28D9",
  primaryDark: "#5B21B6",
  primarySoft: "#EDE9FE",
  accent: "#F472B6",
  text: "#1E1B2E",
  textMuted: "#6B7280",
  border: "#E5E1F5",
  success: "#16A34A",
  danger: "#DC2626",
  white: "#FFFFFF",
};

export const gradients = {
  header: ["#6D28D9", "#9333EA"] as const,
  accent: ["#9333EA", "#F472B6"] as const,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const shadow = {
  card: {
    shadowColor: "#3B0764",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#5B21B6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};
