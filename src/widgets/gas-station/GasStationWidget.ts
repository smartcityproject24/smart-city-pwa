import {
    BoardTypesEnum,
    PetrolPriceTypeEnum,
    partnerNeftPriceTypes,
    petrolStationPriceTypes,
} from "./model/constants";
import type { PetrolPriceConfig } from "./model/types";

interface BoardSetting {
    settingType: string;
    settingName: string;
    settingValue: string;
}

interface Props {
    boardType: BoardTypesEnum;
    settings: BoardSetting[];
}

export const petrolStationWidget = ({
    boardType,
    settings,
}: Props): PetrolPriceConfig[] | null => {
    const partnerNeftPriceInfo: PetrolPriceConfig[] = settings
        .map((price) => {
            if (
                partnerNeftPriceTypes.includes(
                    price.settingType as PetrolPriceTypeEnum,
                )
            ) {
                switch (price.settingType) {
                    case PetrolPriceTypeEnum.PRICE_100:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: 0, height: "16%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_95:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "19%", height: "13%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_SUPER_92:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "33%", height: "16%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_92:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "52%", height: "14%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_DT:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "69%", height: "14%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_GAS:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "86%", height: "14%" },
                        } as PetrolPriceConfig;
                }
            }
        })
        .filter((item): item is PetrolPriceConfig => !!item);

    const petrolStationPriceInfo: PetrolPriceConfig[] = settings
        .map((price) => {
            if (
                petrolStationPriceTypes.includes(
                    price.settingType as PetrolPriceTypeEnum,
                )
            ) {
                switch (price.settingType) {
                    case PetrolPriceTypeEnum.PRICE_GAS:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: 0, height: "16%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_92:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "18%", height: "15%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_SUPER_92:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "35%", height: "16%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_DT:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "53%", height: "15%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_95:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "71%", height: "15%" },
                        } as PetrolPriceConfig;
                    case PetrolPriceTypeEnum.PRICE_100:
                        return {
                            settingType: price.settingType,
                            price: price.settingValue,
                            style: { top: "88%", height: "15%" },
                        } as PetrolPriceConfig;
                }
            }
        })
        .filter((item): item is PetrolPriceConfig => !!item);

    return [
        BoardTypesEnum.PARTNER_NEFT_STATION_DOUBLE,
        BoardTypesEnum.PARTNER_NEFT_STATION,
    ].includes(boardType)
        ? partnerNeftPriceInfo
        : [
                BoardTypesEnum.PETROL_STATION_DOUBLE,
                BoardTypesEnum.PETROL_STATION,
            ].includes(boardType)
          ? petrolStationPriceInfo
          : null;
};
