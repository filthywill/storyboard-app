import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BILLING_PLANS,
  getAlternatePlanInOffer,
  type BillingPlanId,
} from "@/config/billing";
import { supabase } from "@/lib/supabase";
import { getGlassmorphismStyles, getColor } from "@/styles/glassmorphism-styles";

interface ChangeBillingIntervalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: BillingPlanId;
  renewalDate?: string | null;
  onSuccess: () => void;
}

export function ChangeBillingIntervalDialog({
  isOpen,
  onClose,
  currentPlanId,
  renewalDate,
  onSuccess,
}: ChangeBillingIntervalDialogProps) {
  const currentPlan = BILLING_PLANS[currentPlanId];
  const targetPlan = getAlternatePlanInOffer(currentPlanId);
  const isUpgradeToAnnual = currentPlan.interval === "monthly";
  const formattedRenewalDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString()
    : null;

  const confirmationCopy = isUpgradeToAnnual
    ? "Your plan will change to annual billing immediately. Stripe may collect a prorated charge now for the remainder of your billing period."
    : formattedRenewalDate
      ? `Your annual plan stays active until ${formattedRenewalDate}. Monthly billing begins on that date. You will not receive an automatic refund for unused annual time.`
      : "Your annual plan stays active until the end of your current billing period. Monthly billing begins on your renewal date. You will not receive an automatic refund for unused annual time.";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen, currentPlanId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError("You are not logged in. Please log in again.");
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("change-subscription", {
        body: { planId: targetPlan.id },
      });

      if (invokeError) {
        setError(invokeError.message);
        return;
      }

      if (data?.error) {
        setError(typeof data.error === "string" ? data.error : "Could not change billing interval.");
        return;
      }

      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" style={getGlassmorphismStyles("content")}>
        <DialogHeader>
          <DialogTitle style={{ color: getColor("text", "primary") }}>
            Change Billing Interval
          </DialogTitle>
          <DialogDescription style={{ color: getColor("text", "secondary") }}>
            {confirmationCopy}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: getColor("input", "background"),
              border: `1px solid ${getColor("border", "subtle")}`,
            }}
          >
            <p style={{ color: getColor("text", "muted") }}>Current</p>
            <p className="font-medium" style={{ color: getColor("text", "primary") }}>
              {currentPlan.display.label} — {currentPlan.display.price}
            </p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: getColor("input", "background"),
              border: `1px solid ${getColor("interaction", "active")}`,
            }}
          >
            <p style={{ color: getColor("text", "muted") }}>New</p>
            <p className="font-medium" style={{ color: getColor("text", "primary") }}>
              {targetPlan.display.label} — {targetPlan.display.price}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm" role="alert" style={{ color: getColor("status", "statusBadgeRedText") }}>
            {error}
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            disabled={submitting}
            onClick={handleConfirm}
            className="w-full"
            style={getGlassmorphismStyles("buttonAccent")}
          >
            {submitting ? "Updating…" : "Confirm change"}
          </Button>
          <Button
            disabled={submitting}
            onClick={onClose}
            className="w-full"
            style={getGlassmorphismStyles("button")}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
