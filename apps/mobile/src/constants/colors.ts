export const COLOR_PALETTE = {
  warm: [
    "#F48FB1", "#EF5350", "#F44336", "#FF7043", "#FF9800", "#FFC107",
    "#FFEE58", "#D4E157", "#9CCC65", "#4CAF50", "#8BC34A",
  ],
  cool: [
    "#7986CB", "#5C6BC0", "#7E57C2", "#AB47BC", "#8D6E63", "#78909C",
    "#90A4AE", "#B0BEC5", "#CFD8DC", "#E0E0E0", "#616161",
  ],
} as const;

export const ALL_COLORS = [...COLOR_PALETTE.warm, ...COLOR_PALETTE.cool] as const;

export const DEFAULT_COLORS = {
  task: "#7986CB",
  category: "#4CAF50",
} as const;
