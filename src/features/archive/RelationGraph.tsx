import type { Person } from "@/content/schema";
import type { EgoGraph } from "@/lib/archive/graph";
import styles from "./archive.module.css";

type Member = Pick<Person, "id" | "name" | "image">;

const STROKES = { 1: 1.5, 2: 3, 3: 5 } as const;
const NODE_RADIUS = 22;
const CENTER_RADIUS = 32;

function photo(member: Member) {
  return member.image?.rightsStatus === "cleared" && member.image.path ? member.image.path : null;
}

function Disc({ member, x, y, r, clipId, dark }: { member: Member; x: number; y: number; r: number; clipId: string; dark?: boolean }) {
  const src = photo(member);
  return <>
    <circle cx={x} cy={y} r={r} className={dark ? styles.graphCenter : styles.graphNode} />
    {src
      ? <><clipPath id={clipId}><circle cx={x} cy={y} r={r} /></clipPath><image href={src} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" /></>
      : <text x={x} y={y} className={styles.graphInitial} style={{ fontSize: r * 0.8 }} dominantBaseline="central" textAnchor="middle">{member.name.slice(0, 1)}</text>}
  </>;
}

// A server-rendered SVG: every line and every person is a plain link, so the
// graph works without JavaScript and each element is reachable by keyboard.
export function RelationGraph({ center, graph, members, neighbourHref, pairHref }: {
  center: Member; graph: EgoGraph; members: Record<string, Member>; neighbourHref: (id: string) => string; pairHref: (id: string) => string;
}) {
  const { size, center: origin } = graph;
  return <figure className={styles.graph}>
    <svg viewBox={`0 0 ${size} ${size}`} role="group" aria-label={`${center.name}의 관계도`}>
      {graph.nodes.map((node) => {
        const member = members[node.id];
        const labelX = origin.x + (node.x - origin.x) * 0.55;
        const labelY = origin.y + (node.y - origin.y) * 0.55;
        return <a key={`edge-${node.id}`} href={pairHref(node.id)} aria-label={`${center.name}와 ${member.name}: 근거 ${node.weight}건 보기`} className={styles.graphEdgeLink}>
          <line x1={origin.x} y1={origin.y} x2={node.x} y2={node.y} className={styles.graphHit} />
          <line x1={origin.x} y1={origin.y} x2={node.x} y2={node.y} className={styles.graphEdge} strokeWidth={STROKES[node.stroke]} />
          <circle cx={labelX} cy={labelY} r={11} className={styles.graphBadge} />
          <text x={labelX} y={labelY} className={styles.graphWeight} dominantBaseline="central" textAnchor="middle">{node.weight}</text>
        </a>;
      })}
      <g aria-hidden="true"><Disc member={center} x={origin.x} y={origin.y} r={CENTER_RADIUS} clipId="clip-center" dark /></g>
      {graph.nodes.map((node) => {
        const member = members[node.id];
        return <a key={`node-${node.id}`} href={neighbourHref(node.id)} aria-label={`${member.name}의 관계도로 이동`} className={styles.graphNodeLink}>
          <Disc member={member} x={node.x} y={node.y} r={NODE_RADIUS} clipId={`clip-${node.id}`} />
          <text x={node.x} y={node.y < origin.y - 1 ? node.y - NODE_RADIUS - 7 : node.y + NODE_RADIUS + 14} className={styles.graphName} textAnchor="middle">{member.name}</text>
        </a>;
      })}
    </svg>
    <figcaption className={styles.note}>
      선은 한 사람이 다른 사람을 공개적으로 언급하거나 평가한 기록이 있다는 뜻입니다. 굵기와 숫자는 근거 건수이고, 색이나 거리는 아무 뜻이 없습니다. 선을 누르면 근거를, 인물을 누르면 그 사람의 관계도를 봅니다.
      {graph.overflow > 0 && <> 근거가 많은 {graph.nodes.length}명만 그렸고, 나머지 {graph.overflow}명은 아래 목록에 있습니다.</>}
    </figcaption>
  </figure>;
}
