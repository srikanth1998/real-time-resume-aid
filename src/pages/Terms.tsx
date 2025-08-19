import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-white hover:text-gray-300"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Terms of Service & User Agreement</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Service Description</h3>
              <p>
                InterviewAce provides AI-powered interview assistance through real-time audio processing, 
                transcription, and intelligent response generation. Our service includes browser extensions, 
                desktop applications, and web-based tools to help users during interviews.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Data Collection & Processing</h3>
              <p className="mb-2">We collect and process the following data:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Audio recordings during interview sessions</li>
                <li>Transcribed text from audio content</li>
                <li>Generated AI responses and suggestions</li>
                <li>Usage analytics and session metadata</li>
                <li>Payment and billing information</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Privacy & Data Protection</h3>
              <p>
                Your privacy is important to us. Audio data is processed in real-time and can be automatically 
                deleted after sessions if configured. We implement encryption and security measures to protect 
                your sensitive information. We do not share personal data with third parties except as required 
                for service functionality.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. AI & Machine Learning Disclosures</h3>
              <p>
                Our service uses artificial intelligence to generate interview responses. AI-generated content 
                should be reviewed and customized before use. We do not guarantee the accuracy or appropriateness 
                of AI suggestions. Users are responsible for their own interview performance and responses.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h3>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the service for illegal activities</li>
                <li>Violate interview integrity or company policies</li>
                <li>Share or distribute copyrighted content without permission</li>
                <li>Attempt to reverse engineer or hack our systems</li>
                <li>Use the service to harm others or spread misinformation</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Payment Terms</h3>
              <p>
                Payments are processed securely through Stripe. Subscription fees are charged according to your 
                selected plan. Refunds may be available within 30 days of purchase. We reserve the right to 
                modify pricing with advance notice.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h3>
              <p>
                InterviewAce is provided "as is" without warranties. We are not liable for interview outcomes, 
                technical issues, or indirect damages. Our liability is limited to the amount paid for our services. 
                Users assume responsibility for their interview performance and compliance with applicable laws.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Account Termination</h3>
              <p>
                We may suspend or terminate accounts for violations of these terms. Users can cancel subscriptions 
                at any time. Upon termination, access to services will be discontinued, and data may be deleted 
                according to our retention policies.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. Contact Information</h3>
              <p>
                For questions about these terms or our services, please contact us through our support channels 
                or customer service email.
              </p>
            </section>

            <div className="pt-6 border-t border-gray-600">
              <p className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;