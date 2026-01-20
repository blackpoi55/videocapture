import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const patPackageStation = (data) => {
    return POST("/patPackageStation/byArCode", data)
} 

