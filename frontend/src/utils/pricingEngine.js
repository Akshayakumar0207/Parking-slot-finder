const BASE_RATES = { twoWheeler:50, car:100, heavy:200 };

export function predictPrice({ vehicleType, isCityCenter, capacity, locationType }) {
  let base = BASE_RATES[vehicleType] || 50;
  if (isCityCenter)  base = Math.round(base * 1.25);
  if (capacity < 10) base = Math.round(base * 1.15);
  else if (capacity > 30) base = Math.round(base * 0.9);
  const mult = { mall:1.1, basement:1.05, street:0.85, open:0.9 }[locationType] || 1;
  return { price: Math.round(base * mult) };
}

export const VEHICLE_LABELS = { twoWheeler:"2-Wheeler", car:"Car (4W)", heavy:"Heavy Vehicle" };
export const VEHICLE_ICONS  = { twoWheeler:"🛵",        car:"🚗",       heavy:"🚛" };
