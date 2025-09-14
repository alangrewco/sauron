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

export function FilterAccordion({ onStaticChange }: { onStaticChange?: (isStatic: boolean) => void }) {
  const [radius, setRadius] = useState([5]);
  const [showStatic, setShowStatic] = useState(false);

  const handleSwitchChange = (checked: boolean) => {
    setShowStatic(checked);
    if (onStaticChange) {
      onStaticChange(checked); // Pass the value up to parent or hook
    }
  };

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Filters</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <Separator />

          <div className="flex items-center space-x-2">
            <Switch
              id="airplane-mode"
              checked={showStatic}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="airplane-mode">Show Static Devices</Label>
          </div>

          {/* ...existing code... */}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
