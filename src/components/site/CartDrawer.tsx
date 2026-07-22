import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartDrawer() {
  const { isOpen, close, items, subtotal, removeItem, setQty, count } = useCart();

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-[61] h-full w-full max-w-md transform border-l border-border bg-card shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Your cart <span className="text-muted-foreground font-normal">({count})</span></h2>
          </div>
          <button onClick={close} aria-label="Close cart" className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col">
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold">Your cart is empty</div>
              <p className="text-xs text-muted-foreground">Browse bundles and add them to your cart.</p>
              <Link
                to="/buy-data"
                search={{ network: "MTN" }}
                onClick={close}
                className="mt-2 inline-flex items-center rounded-lg gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Shop bundles
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {it.network.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{it.size} · {it.network}</div>
                      <div className="text-xs text-muted-foreground">GHS {it.price.toFixed(2)} each</div>
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border">
                        <button
                          onClick={() => setQty(it.id, it.qty - 1)}
                          className="grid h-6 w-6 place-items-center hover:bg-muted"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{it.qty}</span>
                        <button
                          onClick={() => setQty(it.id, it.qty + 1)}
                          className="grid h-6 w-6 place-items-center hover:bg-muted"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-bold">GHS {(it.price * it.qty).toFixed(2)}</div>
                      <button
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-extrabold">GHS {subtotal.toFixed(2)}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-lg gold-gradient px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Checkout
                </Link>
                <p className="text-center text-[11px] text-muted-foreground">Pay with MoMo, Visa or Mastercard via Paystack.</p>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export function CartToast() {
  const { toast } = useCart();
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 transform transition-all ${
        toast ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
      }`}
      aria-live="polite"
    >
      {toast && (
        <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
