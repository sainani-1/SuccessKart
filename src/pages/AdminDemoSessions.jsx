import React from 'react';
import ClassSchedule from './ClassSchedule';

const AdminDemoSessions = () => (
  <ClassSchedule
    sessionKind="demo"
    pageTitle="Demo Sessions"
    pageDescription="Demo sessions allow students to experience a live class before purchasing a premium plan."
    scheduleButtonLabel="Schedule Demo"
    formTitle="Schedule New Demo Session"
  />
);

export default AdminDemoSessions;
