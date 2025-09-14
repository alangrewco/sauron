'use client';

import { useState } from 'react';
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

export function FilterAccordion() {
  const [radius, setRadius] = useState([5]);

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
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Show Static Devices</Label>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Radius (km)</Label>
            <div className="space-y-2">
              <Slider
                value={radius}
                onValueChange={setRadius}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span className="font-medium">{radius[0]} km</span>
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
