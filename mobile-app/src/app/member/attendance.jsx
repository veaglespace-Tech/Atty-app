import React from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import MyAttendanceCore from "@/components/attendance/MyAttendanceCore";


export default function MemberAttendancePage(props) {
  const { user } = useAuthSession();

  return (
    <>      <MyAttendanceCore user={user} />
    </>
  );
}