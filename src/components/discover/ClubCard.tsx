interface ClubCardProps {
  name: string;
  members: number;
  category: string;
  accent: string;
}

export default function ClubCard({ name, members, category, accent }: ClubCardProps) {
  return (
    <div className="disc-club" style={{ borderTopColor: accent }}>
      <div className="disc-club-name">{name}</div>
      <div className="disc-club-members">{members} members</div>
      <span className="disc-club-tag">{category}</span>
    </div>
  );
}
