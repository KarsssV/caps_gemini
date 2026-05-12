import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '../contexts/auth-context';

type AuthShowcaseProps = {
  variant: "signup" | "login";
};

type FieldConfig = {
  name: string,
  label: string;
  required: boolean,
  type?: string;
  fullWidth?: boolean;
  hasIcon?: boolean;
  validate?: (value: string, allValues: FormData) => string | null;
};

const signupFields: FieldConfig[] = [
  { 
    name: "first_name",
    required: true,
    label: "First name"
  },
  {
    name: "last_name",
    required: true,
    label: "Last name"
  },
  {
    name: "email",
    required: true,
    label: "Email",
    type: "email",
    fullWidth: true,
    validate: (val) => (!val.includes("@") ? "Invalid email address" : null)
  },
  {
    name: "username",
    required: true,
    label: "Username",
    fullWidth: true
  },
  {
    name: "password",
    required: true,
    label: "Enter password",
    type: "password",
    fullWidth: true,
    hasIcon: true,
    validate: (val) => (val.length < 8 ? "Password must be at least 8 characters" : null)
  },
  {
    name: "confirm_password",
    required: true,
    label: "Confirm password",
    type: "password",
    fullWidth: true,
    hasIcon: true,
    validate: (val, all) => (val !== all.password ? "Passwords do not match" : null)
  },
];

const loginFields: FieldConfig[] = [
  {
    name: "email_username",
    required: true,
    label: "Email or username",
    fullWidth: true
  },
  {
    name: "password",
    required: true,
    label: "Password",
    type: "password",
    fullWidth: true,
    hasIcon: true,
    validate: (val) => (val.length < 8 ? "Password must be at least 8 characters" : null)
  },
];

const campusImages = ["/kantor.svg", "/agro-center.svg"] as const;
const switchIntervalMs = 30000;
const fadeDurationMs = 480;

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.75-6 10-6 10 6 10 6-3.75 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// function AuthInput({ name, label, required, type = "text", fullWidth, hasIcon }: FieldConfig) {
//   return (
//     <label className={fullWidth ? "col-span-2" : "col-span-1"}>
//       <span className="sr-only">{label}</span>
//       <div className="flex h-13 items-center rounded-md border border-emerald-950/40 bg-[#0f4b2b]/80 px-4 text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-emerald-300/60 focus-within:text-white">
//         <input
//           name={name}
//           type={type}
//           placeholder={label}
//           className="w-full bg-transparent text-lg outline-none placeholder:text-white/28"
//           required={required}
//         />
//         {hasIcon ? <span className="ml-3 text-white/28"><EyeIcon /></span> : null}
//       </div>
//     </label>
//   );
// }

function CampusArtwork({ imageSrc, fading }: { imageSrc: string; fading: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[26px] border-4 border-[#e2c15d] bg-[#d6ecfb] shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <Image
          src={imageSrc}
          alt="Kantor Petrokimia Gresik"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 635px"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,36,22,0.02)_0%,rgba(7,24,14,0.22)_100%)]" />

      <div className="absolute left-6 top-7">
        <div className="relative h-32.25 w-48.5 overflow-hidden">
          <Image
            src="/logo.svg"
            alt="Petrokimia Gresik logo"
            fill
            className="object-contain"
            sizes="194px"
            priority
          />
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_50%_20%,transparent_0%,transparent_52%,rgba(255,255,255,0.12)_52.5%,transparent_58%)] opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.12)_100%)]" />
    </div>
  );
}

interface FormData {
  [name: string]: string; // Index signature allows dynamic names
}

export default function AuthShowcase({ variant }: AuthShowcaseProps) {
  const router = useRouter();
  const isSignup = variant === "signup";
  const fields = isSignup ? signupFields : loginFields;
  const [imageIndex, setImageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const [formData, setFormData] = useState<FormData>({});
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const {user, token, login, register } = useAuth();

  type FormErrors = Record<string, string | null>;

  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };  

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    fields.forEach((field) => {
      if (field.validate) {
        const value = formData[field.name] || "";
        const error = field.validate(value, formData);
        
        if (error) {
          console.log(field.name + " " + error)
          newErrors[field.name] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (validateForm()) {
      console.log("Form is valid! Sending to API...", formData);
      if (isSignup) { 
        try {
          await register(formData.first_name, formData.last_name, formData.email, formData.username, formData.password);
        } catch (err) {
          setError(/*err instanceof Error ? err.message : */'Registration failed');
          return;
        } finally {
          setLoading(false);
          router.push("/login");
        }
      } else {
        try {
          await login(formData.email_username, formData.password);
        } catch (err) {
          setError(/*err instanceof Error ? err.message : */'Login failed');
          return;
        } finally {
          setLoading(false);
          router.push("/");
        }
      }
    } else {
      setLoading(false);
      setError("Form has errors. Fix them, please.");
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIsFading(true);
      window.setTimeout(() => {
        setImageIndex((currentIndex) => (currentIndex + 1) % campusImages.length);
        setIsFading(false);
      }, fadeDurationMs);
    }, switchIntervalMs);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#424242_0%,#2c2c2c_30%,#212121_100%)] px-4 py-4 text-white">
      <div className="mx-auto h-245.5 w-full max-w-378">
        <p className="mb-4 text-[32px] font-medium tracking-tight text-white/65">
          {isSignup ? "Sign up" : "Log in"}
        </p>

        <section
          className="grid h-[calc(100%-56px)] overflow-hidden rounded-sm border border-emerald-500/20 bg-[linear-gradient(112deg,#135d34_0%,#1d7b40_50%,#155129_100%)] shadow-[0_25px_120px_rgba(0,0,0,0.35)] lg:grid-cols-[1.03fr_1fr]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 28% 30%, rgba(64, 184, 111, 0.26), transparent 28%), radial-gradient(circle at 82% 14%, rgba(255,255,255,0.08), transparent 22%), linear-gradient(112deg, #135d34 0%, #1d7b40 50%, #155129 100%)",
          }}
        >
          <div className="p-3 md:p-5 lg:p-6">
            <div className="mx-auto h-220.25 w-158.75">
              <CampusArtwork imageSrc={campusImages[imageIndex]} fading={isFading} />
            </div>
          </div>

          <div className="flex items-center px-6 py-10 md:px-10 lg:px-16 lg:py-14">
            <div className="mx-auto w-full max-w-125">
              <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-[58px]">
                {isSignup ? "Create an account" : "Welcome back"}
              </h1>
              <p className="mt-5 text-xl text-white/88">
                {isSignup ? "Already have an account?" : "Need an account?"}{" "}
                <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="text-sky-300 underline underline-offset-4 transition hover:text-sky-200"
                >
                  {isSignup ? "Log in" : "Sign up"}
                </Link>
              </p>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fields.map((field) => (
                    <label key={field.name} className={field.fullWidth ? "col-span-2" : "col-span-1"}>
                      <span className="sr-only">{field.label}</span>
                      <div className="flex h-13 items-center rounded-md border border-emerald-950/40 bg-[#0f4b2b]/80 px-4 text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-emerald-300/60 focus-within:text-white">
                        <input
                          name={field.name}
                          type={field.type}
                          placeholder={field.label}
                          className="w-full bg-transparent text-lg outline-none placeholder:text-white/28"
                          value={formData[field.name] || ""}
                          onChange={handleChange}
                          required={field.required}
                        />
                        {field.hasIcon ? <span className="ml-3 text-white/28"><EyeIcon /></span> : null}
                      </div>
                      {errors[field.name] && (
                        <span style={{ color: 'red', fontSize: '12px' }}>
                          {errors[field.name]}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {isSignup ? (
                  <label className="flex items-start gap-3 text-sm text-white/85">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded-sm border border-white/30 bg-white text-emerald-700 accent-white"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/" className="text-sky-300 underline underline-offset-4 hover:text-sky-200">
                        Terms &amp; Conditions
                      </Link>
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-4 text-sm text-white/85">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded-sm border border-white/30 bg-white text-emerald-700 accent-white"
                      />
                      <span>Remember me</span>
                    </label>
                    <Link href="/" className="text-sky-300 underline underline-offset-4 hover:text-sky-200">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-2 h-14 w-full rounded-xl bg-[#e2c15d] text-2xl font-medium text-[#8b6b12] shadow-[0_12px_26px_rgba(115,90,12,0.28)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#f5dc8e] focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  {isSignup ? "Create Account" : "Log In"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}