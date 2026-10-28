import React from 'react';
import { Store, Car, MapPin, Clock, ShieldCheck, ChevronLeft, Info } from 'lucide-react';
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
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-bold text-base leading-tight">Choose Fulfillment Method</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select how you want to claim your custom cake from AH Tinaps Bakeshop.
        </p>
      </div>

      {/* Fulfillment Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...fulfillment, type: 'pickup', timeWindow: pickupWindows[1] })}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
            isPickup
              ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/20'
              : 'bg-background hover:bg-muted/50 border-border/60 text-muted-foreground'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPickup ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold leading-tight">Store Pickup</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">AH Tinaps Mandaluyong</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...fulfillment, type: 'delivery', timeWindow: deliveryWindows[1] })}
          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
            !isPickup
              ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/20'
              : 'bg-background hover:bg-muted/50 border-border/60 text-muted-foreground'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!isPickup ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold leading-tight">Courier Delivery</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">Grab / Lalamove Car</span>
          </div>
        </button>
      </div>

      {/* Content Box */}
      {isPickup ? (
        <div className="space-y-3 p-3.5 bg-muted/30 rounded-xl border border-border/50 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs">Pickup Location</p>
              <p className="text-muted-foreground font-medium text-xs mt-0.5">AH TINAPS BAKESHOP · Mandaluyong City</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Store Hours: 9:00 AM – 7:00 PM daily</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Preferred Pickup Window</Label>
            <div className="grid grid-cols-3 gap-2">
              {pickupWindows.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => onChange({ ...fulfillment, timeWindow: slot })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
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

          <div className="space-y-1 pt-1">
            <Label htmlFor="pickup-notes" className="text-xs text-muted-foreground">
              Pickup Notes / Representative (Optional)
            </Label>
            <Input
              id="pickup-notes"
              placeholder="e.g. My brother will pick up, order under Juan"
              value={fulfillment.notes || ''}
              onChange={(e) => onChange({ ...fulfillment, notes: e.target.value })}
              className="text-xs h-8"
              maxLength={200}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-3.5 bg-muted/30 rounded-xl border border-border/50 text-xs">
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-900 dark:text-amber-200 text-xs leading-snug">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Bakery sends a finished cake photo in chat when ready. Client books GrabCar or Lalamove Car (4-wheel) to pick up.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delivery-address" className="text-xs font-semibold text-foreground">
              Delivery Destination Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="delivery-address"
              placeholder="House/Unit, Street, Barangay, City"
              value={fulfillment.address || ''}
              onChange={(e) => onChange({ ...fulfillment, address: e.target.value })}
              className="text-xs h-8"
              maxLength={250}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="delivery-landmarks" className="text-xs text-muted-foreground">
                Landmarks / Gate / Unit
              </Label>
              <Input
                id="delivery-landmarks"
                placeholder="e.g. Near blue gate, 2nd flr"
                value={fulfillment.landmarks || ''}
                onChange={(e) => onChange({ ...fulfillment, landmarks: e.target.value })}
                className="text-xs h-8"
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery-phone" className="text-xs text-muted-foreground">
                Recipient Contact No.
              </Label>
              <Input
                id="delivery-phone"
                placeholder="0917XXXXXXX"
                value={fulfillment.recipientPhone || ''}
                onChange={(e) => onChange({ ...fulfillment, recipientPhone: e.target.value })}
                className="text-xs h-8"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between">
              <Label className="text-xs font-semibold text-foreground">Preferred Dispatch Window</Label>
              <span className="text-[10px] text-muted-foreground">From AH Tinaps</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ready for driver pickup. Actual travel duration depends on traffic.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {deliveryWindows.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => onChange({ ...fulfillment, timeWindow: slot })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors ${
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

      {/* Streamlined Pay-to-Bake & Order Policy Box */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>Pay-to-Bake &amp; Order Policy</span>
        </div>
        <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed pl-1">
          <p>
            • <strong className="text-foreground">50% Downpayment Today:</strong> Confirms and locks your oven calendar slot.
          </p>
          <p>
            • <strong className="text-foreground">50% Balance &amp; Prep Time:</strong> Preparation time depends on how long the cake is set to be made (not constrained by 48 hours). Paying 48 hours ahead keeps your selected schedule on time; paying later still works to start baking, but will delay your schedule.
          </p>
        </div>

        <label className="flex items-start gap-2 pt-2 border-t border-primary/10 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(fulfillment.policyAgreed)}
            onChange={(e) => onChange({ ...fulfillment, policyAgreed: e.target.checked })}
            className="mt-0.5 rounded border-primary/30 text-primary focus:ring-primary h-4 w-4 shrink-0"
          />
          <span className="text-[11px] font-medium text-foreground leading-snug">
            I understand that preparation time depends on how long my cake takes to make, and paying the remaining balance 48 hours ahead keeps my selected schedule on time (paying later will still proceed but with a delayed schedule).
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-1/3 text-xs h-9"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
        </Button>
        <Button
          type="button"
          disabled={!canContinue}
          className="flex-1 text-xs h-9"
          onClick={onNext}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
