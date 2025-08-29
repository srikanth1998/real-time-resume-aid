import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Code, Image, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const QuotaAdjustment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  
  const planDetails = {
    'coding-helper': {
      name: 'Coding Helper',
      basePrice: 199,
      type: 'coding',
      description: 'AI coding assistance and hints'
    },
    'question-analysis': {
      name: 'Question Analysis',
      basePrice: 99,
      type: 'question',
      description: 'AI question analysis and assistance'
    },
    'pay-as-you-go': {
      name: 'Pay As You Go',
      basePrice: 299,
      type: 'coding',
      description: 'Flexible coding assistance'
    }
  };
  
  const [codingQuota, setCodingQuota] = useState(3);
  const [imageQuota, setImageQuota] = useState(25);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Initialize quota from URL params
  useEffect(() => {
    const quotaParam = searchParams.get('quota');
    
    if (quotaParam) {
      const quota = parseInt(quotaParam);
      
      if (planDetails[planId as keyof typeof planDetails]?.type === 'coding') {
        setCodingQuota(quota);
      } else {
        setImageQuota(quota);
      }
    }
  }, [searchParams, planId]);

  const currentPlan = planDetails[planId as keyof typeof planDetails];
  const isPlanType = (type: string) => currentPlan?.type === type;

  const adjustCodingQuota = (increment: boolean) => {
    setCodingQuota(prev => {
      if (increment) {
        return Math.min(prev + 1, 50);
      } else {
        return Math.max(prev - 1, 3);
      }
    });
  };

  const adjustImageQuota = (increment: boolean) => {
    setImageQuota(prev => {
      if (increment) {
        return Math.min(prev + 25, 500);
      } else {
        return Math.max(prev - 25, 25);
      }
    });
  };

  const calculateTotal = () => {
    if (!currentPlan) return 0;
    
    const basePrice = currentPlan.basePrice;
    
    if (isPlanType('coding')) {
      const additionalQuestions = codingQuota - 3;
      const total = basePrice + (additionalQuestions * 99);
      return total;
    } else if (isPlanType('question')) {
      const additionalQuestions = Math.floor((imageQuota - 25) / 25);
      const total = basePrice + (additionalQuestions * 99);
      return total;
    }
    return basePrice;
  };

  const handleProceedToPayment = () => {
    const params = new URLSearchParams({
      plan: planId || '',
      quota: isPlanType('coding') ? codingQuota.toString() : imageQuota.toString(),
      total: calculateTotal().toFixed(2)
    });
    navigate(`/payment?${params.toString()}`);
  };

  if (!currentPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Plan Not Found</h1>
          <Button onClick={() => navigate('/')}>Go Back Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isPlanType('question') ? 'Customize Your Question Analysis' : `Customize Your ${currentPlan.name}`}
          </h1>
          <p className="text-muted-foreground">{currentPlan.description}</p>
        </motion.div>

        {/* Quota Adjustment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8 backdrop-blur-md bg-card/50 border border-border/50">
            <div className="space-y-8">
              {/* Coding Quota Adjustment */}
              {isPlanType('coding') && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Code className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">Coding Questions</h3>
                  </div>
                  
                  <div className="flex items-center justify-between bg-secondary/20 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Questions included</p>
                      <p className="text-2xl font-bold text-foreground">{codingQuota}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustCodingQuota(false)}
                        disabled={codingQuota <= 3}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        +1 each
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustCodingQuota(true)}
                        disabled={codingQuota >= 50}
                        className="h-10 w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Maximum: 50 questions • Additional questions: ₹99 per question
                  </p>
                </div>
              )}

              {/* Question Quota Adjustment */}
              {isPlanType('question') && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Code className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">Question Analysis</h3>
                  </div>
                  
                  <div className="flex items-center justify-between bg-secondary/20 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Questions included</p>
                      <p className="text-2xl font-bold text-foreground">{imageQuota}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustImageQuota(false)}
                        disabled={imageQuota <= 25}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        +25 each
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustImageQuota(true)}
                        disabled={imageQuota >= 500}
                        className="h-10 w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Maximum: 500 questions • Additional questions: ₹99 per 25 questions
                  </p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="border-t border-border pt-6">
                <div className="flex items-start space-x-2 mb-4">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{" "}
                      <Link 
                        to="/terms" 
                        className="text-primary underline underline-offset-4 hover:no-underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Service and User Agreement
                      </Link>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      You must accept our terms to proceed with payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="border-t border-border pt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-foreground">Total Price</span>
                  <span className="text-3xl font-bold text-primary">₹{calculateTotal()}</span>
                </div>
                
                <Button 
                  onClick={handleProceedToPayment}
                  disabled={!termsAccepted}
                  className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default QuotaAdjustment;