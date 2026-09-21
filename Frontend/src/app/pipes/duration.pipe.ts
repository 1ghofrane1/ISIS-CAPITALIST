import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    const safeSeconds = Math.max(0, Number(seconds ?? 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const wholeSeconds = Math.floor(safeSeconds % 60);
    const tenths = Math.floor((safeSeconds % 1) * 10);

    const time = `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
    return hours > 0 ? `${String(hours).padStart(2, '0')}:${time}` : time;
  }
}
