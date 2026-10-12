import React from 'react';
import { Store, Car, MapPin, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FulfillmentStep({
  fulfillment,
  onChange,
  onNext,
  onBack,
  selectedDate,
}) {
  const isPickup = fulfillment.type === 'pickup';

  const canContinue =
    fulfillment.policyAgreed &&
    (isPickup || (fulfillment.address && fulfillment.address.trim().length >= 5));

  const pickupWindows = [
    '9:00 AM – 12:00 PM',
    '1:00 PM – 4:00 PM',
    '4:00 PM – 7:00 PM',
  ];

  const deliveryWindows = [
    '10:00 AM – 1:00 PM',
    '1:00 PM – 4:00 PM',
    '4:00 PM – 7:00 PM',
  ];

  return (
    <div className="space-y-2.5">
      <div>
        <h3 className="font-heading font-bold text-sm sm:text-base leading-tight">Choose Fulfillment Method</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Select how you want to claim your custom cake from AH Tinaps Bakeshop.
        </p>
      </div>

      {/* Fulfillment Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...fulfillment, type: 'pickup', timeWindow: pickupWindows[1] })}
          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
            isPickup
              ? 'bg-primary/10 border-primary text-foreground shadow-sm'
              : 'bg-background hover:bg-muted/60 border-border/60 text-muted-foreground'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPickup ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold leading-tight">Store Pickup</span>
            <span className="block text-[10px] text-muted-foreground truncate">AH Tinaps Mandaluyong</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...fulfillment, type: 'delivery', timeWindow: deliveryWindows[1] })}
          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
            !isPickup
              ? 'bg-primary/10 border-primary text-foreground shadow-sm'
              : 'bg-background hover:bg-muted/60 border-border/60 text-muted-foreground'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${!isPickup ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            <Car className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold leading-tight">Courier Delivery</span>
            <span className="block text-[10px] text-muted-foreground truncate">Grab / Lalamove Car</span>
          </div>
        </button>
      </div>

      {/* Conditional Content */}
      {isPickup ? (
        <div className="space-y-2.5 p-2.5 bg-muted/30 rounded-xl border border-border/40 text-xs">
          <div className="flex items-start gap-2">
            <div className="p-1 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs">Pickup Location</p>
              <p className="text-muted-foreground font-medium text-[11px]">AH TINAPS BAKESHOP · Mandaluyong City</p>
              <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 font-medium mt-0.5">
                <Clock className="w-3 h-3" />
                <span>Store Hours: 9:00 AM – 7:00 PM daily</span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-border/40 space-y-1">
            <Label className="text-[11px] font-semibold">Preferred Pickup Window</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {pickupWindows.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => onChange({ ...fulfillment, timeWindow: slot })}
                  className={`py-1 px-1.5 rounded-lg text-[10.5px] font-medium border text-center transition-colors ${
                    fulfillment.timeWindow === slot
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-muted border-border/60 text-muted-foreground'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 pt-0.5">
            <Label htmlFor="pickup-notes" className="text-[11px] text-muted-foreground">
              Pickup Notes / Representative (Optional)
            </Label>
            <Input
              id="pickup-notes"
              placeholder="e.g. My brother will pick up, order under Juan"
              value={fulfillment.notes || ''}
              onChange={(e) => onChange({ ...fulfillment, notes: e.target.value })}
              className="text-xs h-7"
              maxLength={200}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 p-2.5 bg-muted/30 rounded-xl border border-border/40 text-xs">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-900 dark:text-amber-200 text-[10.5px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold mb-0.5">
              <Car className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>How Client-Booked Delivery Works</span>
            </div>
            <p>
              When your cake is ready, the bakery sends a finished photo in chat. You will book a <strong>GrabCar or Lalamove Car</strong> (car required to prevent heat &amp; tilt damage) to pick up from the bakery hub.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="delivery-address" className="text-[11px] font-semibold">
              Delivery Destination Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="delivery-address"
              placeholder="House/Unit, Street, Barangay, City"
              value={fulfillment.address || ''}
              onChange={(e) => onChange({ ...fulfillment, address: e.target.value })}
              className="text-xs h-7"
              maxLength={250}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="delivery-landmarks" className="text-[11px] text-muted-foreground">
                Landmarks / Gate / Unit
              </Label>
              <Input
                id="delivery-landmarks"
                placeholder="e.g. Near blue gate, 2nd flr"
                value={fulfillment.landmarks || ''}
                onChange={(e) => onChange({ ...fulfillment, landmarks: e.target.value })}
                className="text-xs h-7"
                maxLength={100}
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="delivery-phone" className="text-[11px] text-muted-foreground">
                Recipient Contact No.
              </Label>
              <Input
                id="delivery-phone"
                placeholder="0917XXXXXXX"
                value={fulfillment.recipientPhone || ''}
                onChange={(e) => onChange({ ...fulfillment, recipientPhone: e.target.value })}
                className="text-xs h-7"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">Preferred Dispatch Window (From Bakery)</Label>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Cake will be boxed &amp; chilled ready for courier pickup. Travel duration depends on traffic.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {deliveryWindows.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => onChange({ ...fulfillment, timeWindow: slot })}
                  className={`py-1 px-1.5 rounded-lg text-[10.5px] font-medium border text-center transition-colors ${
                    fulfillment.timeWindow === slot
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-muted border-border/60 text-muted-foreground'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pay-to-Bake & Policy Card */}
      <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-xl space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11.5px]">Pay-to-Bake &amp; Fulfillment Policy</span>
        </div>
        <ul className="space-y-0.5 text-[10.5px] text-muted-foreground list-disc pl-4 leading-normal">
          <li>
            <strong className="text-foreground">50% Downpayment Today:</strong> Locks and confirms your reserved calendar date slot.
          </li>
          <li>
            <strong className="text-foreground">50% Balance Due 48h Prior:</strong> Baking begins only once 100% paid. Unsettled orders are cancelled to prevent wasted cakes.
          </li>
          <li>
            <strong className="text-foreground">24-Hour Chiller Holding:</strong> Completed cakes are kept refrigerated for up to 24 hours past your scheduled time.
          </li>
        </ul>

        <label className="flex items-start gap-2 pt-1.5 border-t border-primary/10 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(fulfillment.policyAgreed)}
            onChange={(e) => onChange({ ...fulfillment, policyAgreed: e.target.checked })}
            className="mt-0.5 rounded border-primary/30 text-primary focus:ring-primary h-3.5 w-3.5"
          />
          <span className="text-[10.5px] font-medium text-foreground leading-tight">
            I understand that full payment is required 48 hours before my event before baking starts.
          </span>
        </label>
      </div>

      {/* Pinned Action Buttons */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm -mx-1 px-1 pt-1.5 pb-0.5 border-t border-border/30 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-1/3 text-xs h-8"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <Button
          type="button"
          disabled={!canContinue}
          className="flex-1 text-xs h-8"
          onClick={onNext}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
