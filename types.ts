
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
  REQUEST_TRANSFER = 'REQUEST_TRANSFER', // Para el modal de solicitud de compra
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

export interface TransferRequest {
  id?: string; // Firestore doc ID
  itemId: string;
  itemDetails: { // Guardamos una copia de los datos para mostrar
    tipo: string;
    marca: string;
    modelo: string;
    identificador: string;
  };
  sellerId: string;
  buyerId: string;
  buyerEmail: string | null; // El email del que pide la transferencia
  status: TransferStatus;
  createdAt: number; // Timestamp
}

export interface Item {
  tipo: string;
  marca: string;
  modelo: string;
  identificador: string; // Patente or Serial
  // Optional properties that are present on items retrieved from Firestore
  qrId?: string;
  ownerId?: string;
  status?: ItemStatus;
  shortId?: string;
  
  // Geolocation fields
  location?: { lat: number, lng: number } | null; // Where it was reported
  locationTimestamp?: number | null; // When it was reported
  
  recoveryLocation?: { lat: number, lng: number } | null; // Where it was recovered
  recoveryTimestamp?: number | null; // When it was recovered
}