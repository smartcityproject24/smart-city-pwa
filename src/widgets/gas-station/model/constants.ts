export enum PetrolPriceTypeEnum {
    PRICE_100 = "PRICE_100",
    PRICE_95 = "PRICE_95",
    PRICE_92 = "PRICE_92",
    PRICE_SUPER_92 = "PRICE_SUPER_92",
    PRICE_DT = "PRICE_DT",
    PRICE_GAS = "PRICE_GAS",
}

export const petrolStationPriceTypes = [
    PetrolPriceTypeEnum.PRICE_GAS,
    PetrolPriceTypeEnum.PRICE_92,
    PetrolPriceTypeEnum.PRICE_SUPER_92,
    PetrolPriceTypeEnum.PRICE_DT,
    PetrolPriceTypeEnum.PRICE_95,
    PetrolPriceTypeEnum.PRICE_100,
];

export const partnerNeftPriceTypes = [
    PetrolPriceTypeEnum.PRICE_100,
    PetrolPriceTypeEnum.PRICE_95,
    PetrolPriceTypeEnum.PRICE_SUPER_92,
    PetrolPriceTypeEnum.PRICE_92,
    PetrolPriceTypeEnum.PRICE_DT,
    PetrolPriceTypeEnum.PRICE_GAS,
];

export enum BoardTypesEnum {
    PETROL_STATION = "PETROL_STATION",
    PETROL_STATION_DOUBLE = "PETROL_STATION_DOUBLE",
    PARTNER_NEFT_STATION = "PARTNER_NEFT_STATION",
    PARTNER_NEFT_STATION_DOUBLE = "PARTNER_NEFT_STATION_DOUBLE",
}
