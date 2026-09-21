import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bigvalue' })
export class BigValuePipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    const numericValue = Number(value ?? 0);
    if (!Number.isFinite(numericValue)) {
      return '0';
    }

    const absoluteValue = Math.abs(numericValue);
    if (absoluteValue < 1_000_000) {
      return this.formatter.format(numericValue);
    }

    const exponent = Math.floor(Math.log10(absoluteValue) / 3) * 3;
    const mantissa = numericValue / Math.pow(10, exponent);
    return `${this.formatter.format(mantissa)} × 10${this.toSuperscript(exponent)}`;
  }

  private toSuperscript(value: number): string {
    const digits: Record<string, string> = {
      '-': '⁻',
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
    };
    return String(value)
      .split('')
      .map((digit) => digits[digit] ?? digit)
      .join('');
  }
}
