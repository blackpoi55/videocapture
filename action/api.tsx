import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const patPackageStation = (data: unknown) => {
  return POST("/patPackageStation/byArCode", data);
};

