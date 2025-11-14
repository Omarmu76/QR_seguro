// Archivo: types.ts
// Explicación: Añadimos los enums PaymentMethod y PaymentStatus,
// y actualizamos la interfaz Item para incluir los campos de estado de pago.

export enum Screen {
  Home = 'HOME',
  Scan = 'SCAN',
  Generate = 'GENERATE',
  MyItems = 'MY_ITEMS',
  TRANSFERS = 'TRANSFERS',
  ScanResult = 'SCAN_RESULT',
  GeneratedQR = 'GENERATED_QR',
  InputCode = 'INPUT_CODE',
  EditItem = 'EDIT_ITEM',
  Map = 'MAP',
  ItemDetail = 'ITEM_DETAIL',
  REQUEST_TRANSFER = 'REQUEST_TRANSFER',
  PAYMENT_MODAL = 'PAYMENT_MODAL', // <<< AÑADIMOS EL MODAL DE PAGO
}

export enum ItemStatus {
  EnRegla = 'EN_REGLA',
  Denunciado = 'DENUNCIADO',
  Vendido = 'VENDIDO',
  Recuperado = 'RECUPERADO',
  DEVUELTO = 'DEVUELTO',
}

export enum TransferStatus {
  Pending = 'PENDIENTE',
  Approved = 'APROBADO',
  Rejected = 'RECHAZADO',
}

// <<< INICIO DE CÓDIGO NUEVO >>>

// Define los métodos de pago que aceptaremos
export enum PaymentMethod {
  MercadoPago = 'MERCADO_PAGO',
  Pix = 'PIX',
  Mobbex = 'MOBBEX',
  Paypal = 'PAYPAL',
  Custom = 'CUSTOM', // Para tu "propio sistema" futuro
}

// Define el estado de pago de un item
export enum PaymentStatus {
  Pending = 'PENDIENTE', // Recién creado, no pagado
  Paid = 'PAGADO',       // Pago exitoso, funciones desbloqueadas
  Failed = 'FALLIDO',    // El pago falló
}
// <<< FIN DE CÓDIGO NUEVO >>>

export interface TransferRequest {
  id?: string; // Firestore doc ID
  itemId: string;
  itemDetails: { 
    tipo: string;
    marca: string;
    modelo: string;
    identificador: string;
  };
  sellerId: string;
  buyerId: string;
  buyerEmail: string | null;
  status: TransferStatus;
  createdAt: number;
}

export interface Item {
  tipo: string;
  marca: string;
  modelo: string;
  identificador: string; 
  qrId?: string;
  ownerId?: string;
  status?: ItemStatus;
  shortId?: string;
  location?: { lat: number, lng: number } | null; 
  locationTimestamp?: number | null; 
  recoveryLocation?: { lat: number, lng: number } | null; 
  recoveryTimestamp?: number | null; 

  // <<< INICIO DE CAMPOS NUEVOS PARA PAGO >>>
  paymentStatus?: PaymentStatus; // El estado del pago (PENDIENTE, PAGADO)
  paidAt?: number | null;        // Cuándo se pagó
  paymentMethod?: PaymentMethod | null; // Qué método usó
  // <<< FIN DE CAMPOS NUEVOS PARA PAGO >>>
}
