import { useSettingsStore } from '../hooks/useSettingsStore';

export class CurrencyUtils {
  static format(amount: number, overrideCurrency?: string): string {
    const storeCurrency = useSettingsStore.getState().currency;
    const currency = overrideCurrency || storeCurrency || 'INR';
    
    let locale = 'en-IN';
    if (currency === 'USD') locale = 'en-US';
    else if (currency === 'EUR') locale = 'de-DE';
    else if (currency === 'GBP') locale = 'en-GB';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }
}
