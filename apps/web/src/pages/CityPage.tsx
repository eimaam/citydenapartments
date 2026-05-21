import { useParams, Navigate } from 'react-router-dom';
import { AbujaPage } from './cities/AbujaPage';
import { KadunaPage } from './cities/KadunaPage';
import { MaiduguriPage } from './cities/MaiduguriPage';

export const CityPage = () => {
  const { cityId } = useParams<{ cityId: string }>();

  if (cityId === 'abuja') {
    return <AbujaPage />;
  }
  if (cityId === 'kaduna') {
    return <KadunaPage />;
  }
  if (cityId === 'maiduguri') {
    return <MaiduguriPage />;
  }

  return <Navigate to="/" replace />;
};

