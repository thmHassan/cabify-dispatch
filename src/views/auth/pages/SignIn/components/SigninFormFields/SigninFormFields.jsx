import { ErrorMessage, Field } from "formik";
import Password from "../../../../../../components/elements/CustomPassword/Password";
import FormLabel from "../../../../../../components/ui/FormLabel";

const SigninFormFields = () => {
  return (
    <>
      <div>
        <FormLabel
          htmlFor="Email"
          className="text-sm sm:text-[15px] md:text-base lg:text-[17px] xl:text-[18px] leading-5 sm:leading-[22px] md:leading-6 lg:leading-[24px] xl:leading-[25px] mb-1 sm:mb-[5px] text-[#363636]"
        >
          Email
        </FormLabel>
        <div>
          <div>
            <Field
              name="email"
              type="text"
              className="border-[1.2px] border-[#E0E0E0] focus:outline-none h-12 sm:h-[52px] md:h-14 lg:h-[54px] xl:h-[56px] rounded-lg p-3 sm:p-[14px] md:p-3.5 lg:p-[15px] xl:p-4 text-sm sm:text-[15px] md:text-base lg:text-[17px] xl:text-[18px] font-semibold leading-5 sm:leading-[22px] md:leading-6 w-full placeholder:text-[#9C9C9C]"
              placeholder="Enter your email"
              autoComplete="off"
            />
          </div>
          <ErrorMessage
            name="email"
            component="div"
            className="text-red-500 text-xs sm:text-sm"
          />
        </div>
      </div>
      <div>
        <div>
          <FormLabel
            htmlFor="Password"
            className="text-sm sm:text-[15px] md:text-base lg:text-[17px] xl:text-[18px] leading-5 sm:leading-[22px] md:leading-6 lg:leading-[24px] xl:leading-[25px] mb-1 sm:mb-[5px] text-[#363636]"
          >
            Password
          </FormLabel>
          <div>
            <Password
              name="password"
              className="border-[1.2px] border-[#E0E0E0] focus:outline-none h-12 sm:h-[52px] md:h-14 lg:h-[54px] xl:h-[56px] rounded-lg p-3 sm:p-[14px] md:p-3.5 lg:p-[15px] xl:p-4 text-sm sm:text-[15px] md:text-base lg:text-[17px] xl:text-[18px] font-semibold leading-5 sm:leading-[22px] md:leading-6 w-full placeholder:text-[#9C9C9C]"
              placeholder="Enter your password"
              autoComplete="off"
            />
            <ErrorMessage
              name="password"
              component="div"
              className="text-red-500 text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SigninFormFields;
