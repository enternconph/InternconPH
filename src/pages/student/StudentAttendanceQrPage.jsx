import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentAttendanceQrModal from '../../components/Student/StudentAttendanceQrModal';

export default function StudentAttendanceQrPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard/student/ojt', { replace: true });
    }
  };

  return (
    <StudentAttendanceQrModal
      isOpen={true}
      isFullPage={true}
      onClose={handleBack}
    />
  );
}

