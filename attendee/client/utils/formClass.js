import clsx from "clsx";

export const handleClass = (formik, key) => {
  return clsx(
    "w-full border-2 p-3 rounded-2xl transition-all duration-300 outline-none bg-white",
    {
      "border-red-500 bg-red-50/10 focus:ring-red-100": formik.touched[key] && formik.errors[key],
      "border-emerald-500 bg-emerald-50/10 focus:ring-emerald-100": formik.touched[key] && !formik.errors[key],
      "border-gray-100 focus:border-blue-600 focus:ring-blue-100": !formik.touched[key],
    }
  );
};
