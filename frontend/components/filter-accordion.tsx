'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';

interface FilterAccordionProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  showStatic: boolean;
  onShowStaticChange: (show: boolean) => void;
}

export function FilterAccordion({
  radius,
  onRadiusChange,
  showStatic,
  onShowStaticChange,
}: FilterAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Filters</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <Separator />

          <div className="flex items-center space-x-2">
            <Switch
              id="static-devices"
              checked={showStatic}
              onCheckedChange={onShowStaticChange}
            />
            <Label htmlFor="static-devices">Include Static Devices</Label>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Search Radius (km)</Label>
            <div className="space-y-2">
              <Slider
                value={[radius]}
                onValueChange={(value) => onRadiusChange(value[0])}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span className="font-medium">{radius} km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
          <Separator />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}