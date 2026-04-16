interface TeamCardProps {
  title: string;
  subtitle: string;
  needs: string;
  members: { initials: string; bg: string }[];
  spotsOpen: number;
  tags: string[];
  accent: string;
}

export default function TeamCard({
  title,
  subtitle,
  needs,
  members,
  spotsOpen,
  tags,
  accent,
}: TeamCardProps) {
  return (
    <div className="disc-tcard" style={{ borderTopColor: accent }}>
      <div className="disc-tcard-title">{title}</div>
      <div className="disc-tcard-sub">{subtitle}</div>
      <div className="disc-tcard-need">Needs: {needs}</div>
      <div className="disc-tcard-members">
        <div className="disc-tcard-avs">
          {members.map((m, i) => (
            <div key={i} className="disc-tcard-av" style={{ background: m.bg }}>{m.initials}</div>
          ))}
        </div>
        <span className="disc-tcard-spots">{spotsOpen} spot{spotsOpen > 1 ? "s" : ""} open</span>
      </div>
      <div className="disc-tcard-tags">
        {tags.map((t) => (
          <span key={t} className="disc-tcard-tag">{t}</span>
        ))}
      </div>
      <button className="disc-tcard-btn">Apply to Join</button>
    </div>
  );
}
