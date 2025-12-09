// types.ts

export enum ItemStatus {
  EnRegla = 'EN_REGLA',
  Denunciado = 'DENUNCIADO',
  Recuperado = 'RECUPERADO',
  Vendido = 'VENDIDO', // Opcional, para lógica futura
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Free = 'FREE' // Para items viejos o promo
}

export enum PaymentMethod {
  MercadoPago = 'MERCADO_PAGO',
  Pix = 'PIX',
  Mobbex = 'MOBBEX',
  Paypal = 'PAYPAL',
  Custom = 'CUSTOM', // Para tu "propio sistema" futuro
}

// AQUÍ ESTABA EL PROBLEMA: Faltaba REQUEST_TRANSFER
export enum Screen {
  Home = 'HOME',
  Generate = 'GENERATE',
  Scan = 'SCAN',
  MyItems = 'MY_ITEMS',
  GeneratedQR = 'GENERATED_QR',
  ScanResult = 'SCAN_RESULT',
  InputCode = 'INPUT_CODE',
  EditItem = 'EDIT_ITEM',
  Map = 'MAP',
  ItemDetail = 'ITEM_DETAIL',
  TRANSFERS = 'TRANSFERS',     // Pantalla del vendedor (lista)
  REQUEST_TRANSFER = 'REQUEST_TRANSFER', // <--- ¡NUEVO! Pantalla del comprador (solicitud)
  PAYMENT_MODAL = 'PAYMENT_MODAL' // <--- ¡NUEVO! Para pagar seguro
}

export enum TransferStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Cancelled = 'CANCELLED'
}

export interface TransferRequest {
  id: string;
  itemId: string;
  itemDetails: {
    tipo: string;
    marca: string;
    modelo: string;
    identificador: string;
  };
  sellerId: string;
  buyerId: string;
  buyerEmail: string;
  status: TransferStatus;
  createdAt: number;
}

export interface Item {
  qrId?: string; // ID de documento Firestore
  shortId?: string; // Código corto (ej: ABC-123)
  ownerId: string;
  tipo: string;
  marca: string;
  modelo: string;
  identificador: string; // Serie, chasis, DNI
  description?: string;
  status: ItemStatus;
  paymentStatus?: PaymentStatus;

  // Datos de Geolocalización
  location?: { lat: number; lng: number } | null;
  locationTimestamp?: number | null; // Cuándo se reportó

  recoveryLocation?: { lat: number; lng: number } | null;
  recoveryTimestamp?: number | null;
}
