import { Appointment, Service } from '../types';

export type FinancialMetricClassification = 'ESTIMATED_REVENUE';
export type AttributionSourceStatus = 'NOT_AVAILABLE_IN_CURRENT_SOURCE_TRUTH';

export const ESTIMATED_REVENUE_LIMITATION =
  'Estimated revenue derived from current service catalog price. Does not represent settled, collected, or accounting revenue.';

export interface ReportMetricsResult {
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  estimatedRevenue: number;
  averageAppointmentValue: number;
  mostBookedService: string;
  topRevenueService: string;
  sourceBreakdown: Record<string, number>;
  occupiedMinutes: number;
  financialMetricClassification: FinancialMetricClassification;
  financialMetricLimitation: string;
  attributionStatus: {
    acquisitionSourceStatus: AttributionSourceStatus;
    campaignAttributionStatus: AttributionSourceStatus;
  };
}

export type MobileRevenuePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface MobileRevenueSummaryItem {
  label: string;
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  estimatedNetRevenue: number;
  completedAppointments: number;
}

export type MobileRevenueSummary = Record<
  MobileRevenuePeriod,
  MobileRevenueSummaryItem
>;

const MOBILE_REVENUE_LABELS: Record<MobileRevenuePeriod, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  quarterly: 'Son 3 Ay',
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isCanceledAppointment(appointment: Appointment): boolean {
  return (
    appointment.status === 'cancelled' ||
    appointment.status === 'cancelled_by_customer' ||
    appointment.status === 'cancelled_by_salon' ||
    appointment.status === 'cancelled_by_system'
  );
}

export const reportingService = {
  getMobileRevenueSummary(
    appointments: Appointment[],
    services: Service[],
    nowInput: Date = new Date()
  ): MobileRevenueSummary {
    const now = startOfDay(nowInput);
    const periodStarts: Record<MobileRevenuePeriod, Date> = {
      daily: now,
      weekly: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
      monthly: new Date(now.getFullYear(), now.getMonth(), 1),
      quarterly: new Date(now.getFullYear(), now.getMonth() - 2, 1),
    };

    const servicePriceById = new Map(
      services.map((service) => [service.id, Number(service.price) || 0])
    );

    return (Object.keys(MOBILE_REVENUE_LABELS) as MobileRevenuePeriod[]).reduce(
      (summary, period) => {
        const periodAppointments = appointments.filter((appointment) => {
          const appointmentDate = startOfDay(new Date(appointment.date));
          return (
            !Number.isNaN(appointmentDate.getTime()) &&
            appointmentDate >= periodStarts[period] &&
            appointmentDate <= now &&
            !isCanceledAppointment(appointment)
          );
        });
        const serviceRevenue = periodAppointments.reduce(
          (total, appointment) =>
            total + (servicePriceById.get(appointment.serviceId) || 0),
          0
        );

        summary[period] = {
          label: MOBILE_REVENUE_LABELS[period],
          revenue: serviceRevenue,
          serviceRevenue,
          productRevenue: 0,
          estimatedNetRevenue: Math.round(serviceRevenue * 0.8),
          completedAppointments: periodAppointments.filter(
            (appointment) =>
              appointment.status === 'confirmed' || appointment.status === 'completed'
          ).length,
        };
        return summary;
      },
      {} as MobileRevenueSummary
    );
  },

  getReportMetrics(
    appointments: Appointment[],
    services: Service[],
    dateRange: 'this_month' | 'last_month' | 'last_30_days'
  ): ReportMetricsResult {
    const now = new Date();

    // Filter dates
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      if (dateRange === 'this_month') {
        return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return aptDate.getMonth() === lastMonth && aptDate.getFullYear() === year;
      }
      if (dateRange === 'last_30_days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return aptDate >= thirtyDaysAgo && aptDate <= now;
      }
      return true;
    });

    const totalAppointments = filteredAppointments.length;
    const completedAppointments = filteredAppointments.filter(
      a => a.status === 'confirmed' || a.status === 'completed'
    ).length;
    const canceledAppointments = filteredAppointments.filter(
      a =>
        a.status === 'cancelled' ||
        a.status === 'cancelled_by_customer' ||
        a.status === 'cancelled_by_salon' ||
        a.status === 'cancelled_by_system'
    ).length;

    let estimatedRevenue = 0;
    let occupiedMinutes = 0;
    const serviceRevenueMap: Record<string, number> = {};
    const serviceCountMap: Record<string, number> = {};
    const sourceCountMap: Record<string, number> = {};

    filteredAppointments.forEach(apt => {
      if (apt.source) {
        sourceCountMap[apt.source] = (sourceCountMap[apt.source] || 0) + 1;
      }

      if (
        apt.status === 'cancelled' ||
        apt.status === 'cancelled_by_customer' ||
        apt.status === 'cancelled_by_salon' ||
        apt.status === 'cancelled_by_system'
      ) {
        return;
      }

      const service = services.find(s => s.id === apt.serviceId);
      // Fallback to service current price if no snapshot exists currently
      const price = service ? service.price : 0;
      estimatedRevenue += price;
      occupiedMinutes += apt.durationMinutes ?? service?.duration ?? 30;

      if (service) {
        serviceRevenueMap[service.name] = (serviceRevenueMap[service.name] || 0) + price;
        serviceCountMap[service.name] = (serviceCountMap[service.name] || 0) + 1;
      }
    });

    const averageAppointmentValue = completedAppointments > 0 ? estimatedRevenue / completedAppointments : 0;

    let mostBookedService = '';
    let maxCount = 0;
    for (const [s, count] of Object.entries(serviceCountMap)) {
      if (count > maxCount) {
        maxCount = count;
        mostBookedService = s;
      }
    }

    let topRevenueService = '';
    let maxRev = 0;
    for (const [s, rev] of Object.entries(serviceRevenueMap)) {
      if (rev > maxRev) {
        maxRev = rev;
        topRevenueService = s;
      }
    }

    return {
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      estimatedRevenue,
      averageAppointmentValue,
      mostBookedService,
      topRevenueService,
      sourceBreakdown: sourceCountMap,
      occupiedMinutes,
      financialMetricClassification: 'ESTIMATED_REVENUE',
      financialMetricLimitation: ESTIMATED_REVENUE_LIMITATION,
      attributionStatus: {
        acquisitionSourceStatus: 'NOT_AVAILABLE_IN_CURRENT_SOURCE_TRUTH',
        campaignAttributionStatus: 'NOT_AVAILABLE_IN_CURRENT_SOURCE_TRUTH'
      }
    };
  }
};
