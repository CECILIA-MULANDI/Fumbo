import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DrawsCard() {
  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Draws
        </p>
        <CardTitle className="mt-1 text-2xl">Recent draws & prizes</CardTitle>
        <CardDescription>
          The pool runs a draw weekly. Only you learn if you won. Claim from here when a prize is
          waiting.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            No draws yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once the first weekly draw runs, your eligibility and any prize appear here.
          </p>
        </div>
        <Button variant="outline" className="h-10 self-end rounded-md px-4" disabled>
          Check for prize
        </Button>
      </CardContent>
    </Card>
  );
}
