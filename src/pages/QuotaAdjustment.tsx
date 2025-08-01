import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Code, Image, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const QuotaAdjustment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  
  const [codingQuota, setCodingQuota] = useState(5);
  const [imageQuota, setImageQuota] = useState(100);

  const planDetails = {
    'coding-helper': {
      name: 'Coding Helper',
      basePrice: 6.99,
      type: 'coding',
      description: 'AI coding assistance and hints'
    },
    'question-analysis': {
      name: 'Question Analysis',
      basePrice: 6.99,
      type: 'image',
      description: 'Visual question analysis'
    },
    'pay-as-you-go': {
      name: 'Pay As You Go',
      basePrice: 6.99,
      type: 'coding',
      description: 'Flexible coding assistance'
    }
  };

  const currentPlan = planDetails[planId as keyof typeof planDetails];
  const isPlanType = (type: string) => currentPlan?.type === type;

  const adjustCodingQuota = (increment: boolean) => {
    setCodingQuota(prev => {
      if (increment) {
        return Math.min(prev + 5, 50);
      } else {
        return Math.max(prev - 5, 5);
      }
    });
  };

  const adjustImageQuota = (increment: boolean) => {
    setImageQuota(prev => {
      if (increment) {
        return Math.min(prev + 100, 500);
      } else {
        return Math.max(prev - 100, 100);
      }
    });
  };

  const calculateTotal = () => {
    const basePrice = currentPlan?.basePrice || 6.99;
    if (isPlanType('coding')) {
      const additionalQuestions = (codingQuota - 5) / 5;
      return basePrice + (additionalQuestions * 6.99);
    } else if (isPlanType('image')) {
      const additionalImages = (imageQuota - 100) / 100;
      return basePrice + (additionalImages * 6.99);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Customize Your {currentPlan.name}</h1>
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
                        disabled={codingQuota <= 5}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        +5 each
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
                    Maximum: 50 questions • Additional questions: $6.99 per 5 questions
                  </p>
                </div>
              )}

              {/* Image Quota Adjustment */}
              {isPlanType('image') && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Image className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">Image Analysis</h3>
                  </div>
                  
                  <div className="flex items-center justify-between bg-secondary/20 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Images included</p>
                      <p className="text-2xl font-bold text-foreground">{imageQuota}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustImageQuota(false)}
                        disabled={imageQuota <= 100}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                        +100 each
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
                    Maximum: 500 images • Additional images: $6.99 per 100 images
                  </p>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="border-t border-border pt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-foreground">Total Price</span>
                  <span className="text-3xl font-bold text-primary">${calculateTotal().toFixed(2)}</span>
                </div>
                
                <Button 
                  onClick={handleProceedToPayment}
                  className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90"
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