import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnalyticsService } from '@/services/analytics/AnalyticsService';

export function AnalyticsRouteListener() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    AnalyticsService.capturePageView(path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
