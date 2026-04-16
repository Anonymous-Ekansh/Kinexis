interface EventCardProps {
  type: string;
  title: string;
  org: string;
  accent: string;
  attendees?: { initials: string; bg: string }[];
  featured?: boolean;
  date?: { day: string; month: string };
  location?: string;
}

export default function EventCard({
  type,
  title,
  org,
  accent,
  attendees = [],
  featured = false,
  date,
  location,
}: EventCardProps) {
  if (featured && date) {
    return (
      <div className="disc-ecard disc-ecard-featured" style={{ borderTopColor: accent }}>
        <div className="disc-ef-left">
          <div className="disc-ecard-badge">{type}</div>
          <div className="disc-ecard-title">{title}</div>
          <div className="disc-ecard-org">{org}</div>
          <div className="disc-ecard-footer">
            <div className="disc-ecard-avs">
              {attendees.map((a, i) => (
                <div key={i} className="disc-ecard-av" style={{ background: a.bg }}>{a.initials}</div>
              ))}
            </div>
            <button className="disc-ecard-rsvp">RSVP</button>
          </div>
        </div>
        <div className="disc-ef-right">
          <div className="disc-ef-day" style={{ color: accent }}>{date.day}</div>
          <div className="disc-ef-month">{date.month}</div>
          {location && <div className="disc-ef-loc">📍 {location}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="disc-ecard" style={{ borderTopColor: accent }}>
      <div className="disc-ecard-badge">{type}</div>
      {date && <div className="disc-ecard-date">{date.month} {date.day}</div>}
      <div className="disc-ecard-title">{title}</div>
      <div className="disc-ecard-org">{org}</div>
      <div className="disc-ecard-footer">
        <div className="disc-ecard-avs">
          {attendees.map((a, i) => (
            <div key={i} className="disc-ecard-av" style={{ background: a.bg }}>{a.initials}</div>
          ))}
        </div>
        <button className="disc-ecard-rsvp">RSVP</button>
      </div>
    </div>
  );
}
