import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/billing"), 1200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p className="text-muted-foreground">
        Your Pro subscription is active. Redirecting you back to billing…
      </p>

      <div className="flex gap-3">
        <Button onClick={() => navigate("/billing")}>Go to Billing</Button>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to App
        </Button>
      </div>
    </div>
  );
}
