import { STATUS_COLOR, STATUS_LABEL, type StatusKey } from "../lib/statuses";
import styles from "./ui.module.css";

export function StatusPill({ status }: { status: StatusKey }) {
  const color = STATUS_COLOR[status];
  return (
    <span className={styles.pill} style={{ background: color.bg, color: color.fg }}>
      {STATUS_LABEL[status]}
    </span>
  );
}
