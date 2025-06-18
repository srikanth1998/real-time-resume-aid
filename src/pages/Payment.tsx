import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Payment = () => {
  const [planType, setPlanType] = useState<"standard" | "pro" | "elite" | "pay-as-you-go">("standard");
  const [deviceMode, setDeviceMode] = useState<"single" | "cross">("single");
  const [hours, setHours] = useState<number | undefined>(undefined);
  const [totalPrice, setTotalPrice] = useState<number | undefined>(undefined);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePayAsYouGoHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = parseInt(e.target.value, 10);
    setHours(isNaN(newHours) ? undefined : newHours);
    // Calculate total price based on hours (example: $18 per hour)
    setTotalPrice(isNaN(newHours) ? undefined : newHours * 1800); // Price in cents
  };

  const getPlanDetails = () => {
    switch (planType) {
      case "standard":
        return { name: "Single Session", price: 18.00, duration: "60 minutes", description: "One-time private coaching session" };
      case "pro":
        return { name: "Pro Plan", price: 29.00, duration: "4 sessions", description: "Four coaching sessions per month" };
      case "elite":
        return { name: "Elite Plan", price: 99.00, duration: "20 credits", description: "Premium coaching features" };
      case "pay-as-you-go":
        return {
          name: "Quick Session",
          price: hours ? hours * 18.00 : 18.00,
          duration: hours ? `${hours} hour${hours > 1 ? 's' : ''}` : "1 hour",
          description: "Pay-per-hour coaching session"
        };
      default:
        return { name: "Single Session", price: 18.00, duration: "60 minutes", description: "One-time private coaching session" };
    }
  };

  const planDetails = getPlanDetails();

  const handlePayment = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: planType,
          priceAmount: planDetails.price * 100, // Amount in cents
          planName: planDetails.name,
          duration: planDetails.duration,
          deviceMode: deviceMode,
          userEmail: email,
          totalPrice: totalPrice,
          hours: hours
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe checkout
      } else {
        toast({
          title: "Payment Failed",
          description: "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Brain className="h-10 w-10 text-blue-500" />
              <span className="text-3xl font-bold">InterviewAce</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300">
              AI-powered interview coaching with stealth overlay technology
            </p>
          </div>

          {/* Download Section */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-400" />
                Download Native Helper
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-gray-300">
                  <p className="mb-2">Get the native helper for advanced features:</p>
                  <ul className="text-sm space-y-1">
                    <li>• System audio capture without virtual drivers</li>
                    <li>• Stealth overlay hidden from screen sharing</li>
                    <li>• Works with any meeting platform</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => window.open('/downloads', '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Helper
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Standard Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Single Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">{planDetails.description}</p>
                <div className="text-2xl font-bold text-blue-400">${planType === "standard" ? planDetails.price : 18.00}</div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handlePayment}
                  disabled={planType !== "standard"}>
                  {planType === "standard" ? "Get Started" : "Select"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPlanType("standard")}>
                  {planType === "standard" ? "Selected" : "Select"}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Pro Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">Four coaching sessions per month</p>
                <div className="text-2xl font-bold text-blue-400">${planType === "pro" ? planDetails.price : 29.00}</div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handlePayment}
                  disabled={planType !== "pro"}>
                  {planType === "pro" ? "Get Started" : "Select"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPlanType("pro")}>
                  {planType === "pro" ? "Selected" : "Select"}
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Elite Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">Premium coaching features</p>
                <div className="text-2xl font-bold text-blue-400">${planType === "elite" ? planDetails.price : 99.00}</div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handlePayment}
                  disabled={planType !== "elite"}>
                  {planType === "elite" ? "Get Started" : "Select"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPlanType("elite")}>
                  {planType === "elite" ? "Selected" : "Select"}
                </Button>
              </CardContent>
            </Card>

            {/* Pay-As-You-Go Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">Pay-per-hour coaching session</p>

                <div className="mb-4">
                  <Label htmlFor="hours" className="text-sm text-gray-300">
                    Number of Hours:
                  </Label>
                  <Input
                    type="number"
                    id="hours"
                    placeholder="Enter hours"
                    className="mt-1 text-black"
                    onChange={handlePayAsYouGoHoursChange}
                  />
                </div>

                <div className="text-2xl font-bold text-blue-400">
                  ${planType === "pay-as-you-go" && hours ? hours * 18.00 : 18.00}
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handlePayment}
                  disabled={planType !== "pay-as-you-go"}
                >
                  {planType === "pay-as-you-go" ? "Get Started" : "Select"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPlanType("pay-as-you-go")}>
                  {planType === "pay-as-you-go" ? "Selected" : "Select"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Device Mode Selection */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Device Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="single" className="flex flex-col space-y-2" onValueChange={setDeviceMode}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="r1" className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                  <Label htmlFor="r1" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300">
                    Single Device
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cross" id="r2" className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                  <Label htmlFor="r2" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300">
                    Cross-Device
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Email Input */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Your Email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" placeholder="Enter your email" value={email} onChange={handleEmailChange} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;
