import React, { useState } from 'react';
import ScheduleTable from './ScheduleTable';

const SecondShiftPage: React.FC = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div>
      <h2>Расписание</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Дата:
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
      </div>
      <ScheduleTable date={date} startLessonNumber={5} />
    </div>
  );
};

export default SecondShiftPage; 