"use client";

import { Heart, Plus, UserRound } from "lucide-react";

type HomeUser = { id: string; name: string };

export default function InstagramHomeReplica({
  onCreate, onNotifications, users
}: {
  onCreate: () => void;
  onNotifications: () => void;
  users: HomeUser[];
}) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/><i/></button>
      <div className="nv-ig-wordmark">NOVYRA</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>

    {users.length > 0 && <section className="nv-home-people" dir="rtl" aria-label="کاربران این فید">
      <div className="nv-home-people-heading">کاربران این فید</div>
      <div className="nv-home-people-list">
        {users.map(user => <div className="nv-home-person" key={user.id}>
          <span className="nv-home-person-avatar"><UserRound/></span>
          <span>{user.name}</span>
        </div>)}
      </div>
    </section>}
  </section>;
}
