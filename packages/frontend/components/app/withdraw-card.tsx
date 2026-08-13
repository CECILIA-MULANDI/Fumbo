import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WithdrawCard() {
  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Withdraw
        </p>
        <CardTitle className="mt-1 text-2xl">Take your principal back</CardTitle>
        <CardDescription>
          Your deposit is never at risk. Withdraw the full principal anytime. The amount stays
          encrypted end-to-end.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">Coming next</span>
        <Button variant="outline" className="h-10 rounded-md px-4" disabled>
          Withdraw all
        </Button>
      </CardContent>
    </Card>
  );
}
