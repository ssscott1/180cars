import { addDays } from 'date-fns';

export interface ScheduleEntry {
  agreement_id: string;
  payment_type: 'deposit' | 'weekly_rental';
  week_number: number;
  due_date: string;
  amount_due: number;
  payment_status: 'pending';
}

export function generatePaymentSchedule(
  agreementId: string,
  depositAmount: number,
  weeklyAmount: number,
  startDate: Date,
  weeksToGenerate = 156
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];

  // Week 0: deposit
  schedule.push({
    agreement_id: agreementId,
    payment_type: 'deposit',
    week_number: 0,
    due_date: startDate.toISOString().split('T')[0],
    amount_due: depositAmount,
    payment_status: 'pending',
  });

  // Week 1+: weekly rentals
  let currentDate = addDays(startDate, 7);
  for (let week = 1; week <= weeksToGenerate; week++) {
    schedule.push({
      agreement_id: agreementId,
      payment_type: 'weekly_rental',
      week_number: week,
      due_date: currentDate.toISOString().split('T')[0],
      amount_due: weeklyAmount,
      payment_status: 'pending',
    });
    currentDate = addDays(currentDate, 7);
  }

  return schedule;
}

export function calculatePricing(purchasePrice: number) {
  const weekly = Math.round((purchasePrice / 110) * 100) / 100;
  const deposit = Math.round(weekly * 6 * 100) / 100;
  return { weekly_rental_amount: weekly, deposit_amount: deposit };
}
