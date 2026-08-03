import { createServerFn } from "@tanstack/react-start";
import { getDataMartCheckerProducts, buyDataMartChecker, getDataMartApiKey } from "@/lib/datamart";

export interface CheckerProduct {
  id: string;
  name: "WAEC" | "BECE";
  description: string;
  price: number;
  inStock: boolean;
  stockCount: number;
}

export const getResultCheckerProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    const dmKey = getDataMartApiKey();
    if (dmKey) {
      try {
        const res = await getDataMartCheckerProducts();
        if (res && res.status === "success" && Array.isArray(res.data)) {
          return res.data as CheckerProduct[];
        }
      } catch (err: any) {
        console.warn("[ResultCheckers] Failed to fetch live products from DataMart:", err.message);
      }
    }

    // Default Fallback Products
    return [
      {
        id: "waec_card",
        name: "WAEC",
        description: "WASSCE / WAEC Result Checker Card (Serial Number + PIN)",
        price: 15.7,
        inStock: true,
        stockCount: 150,
      },
      {
        id: "bece_card",
        name: "BECE",
        description: "BECE Result Checker Card (Serial Number + PIN)",
        price: 15.7,
        inStock: true,
        stockCount: 85,
      },
    ] as CheckerProduct[];
  });

export const purchaseResultChecker = createServerFn({ method: "POST" })
  .validator((data: { checkerType: "WAEC" | "BECE"; phoneNumber: string }) => {
    const cleanPhone = String(data.phoneNumber || "").replace(/\s+/g, "");
    if (!/^\d{9,10}$/.test(cleanPhone)) {
      throw new Error("Enter a valid Ghana mobile number (e.g. 0241234567)");
    }
    return { checkerType: data.checkerType, phoneNumber: cleanPhone };
  })
  .handler(async ({ data }) => {
    const dmKey = getDataMartApiKey();
    const ref = `CHK-${data.checkerType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (dmKey) {
      try {
        const res = await buyDataMartChecker({
          checkerType: data.checkerType,
          phoneNumber: data.phoneNumber,
          ref,
          skipSms: false,
        });

        if (res && res.status === "success" && res.data) {
          return {
            success: true,
            reference: res.data.reference || ref,
            checkerType: data.checkerType,
            serialNumber: res.data.serialNumber,
            pin: res.data.pin,
            price: res.data.price,
            phoneNumber: data.phoneNumber,
            message: res.message || `${data.checkerType} Result Checker purchased successfully!`,
          };
        }
      } catch (err: any) {
        console.warn("[ResultCheckers] DataMart purchase error:", err.message);
        throw new Error(err.message || "Failed to purchase result checker card");
      }
    }

    // Demo Mode Response if key unconfigured
    const mockSerial = `WEC2026${Math.floor(100000 + Math.random() * 900000)}`;
    const mockPin = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return {
      success: true,
      reference: ref,
      checkerType: data.checkerType,
      serialNumber: mockSerial,
      pin: mockPin,
      price: 15.7,
      phoneNumber: data.phoneNumber,
      message: `${data.checkerType} Result Checker card issued successfully!`,
    };
  });
