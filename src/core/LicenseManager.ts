// =====================================================
// DEVFORGE AI - LICENSE AGREEMENT
// =====================================================
// IMPORTANT: READ CAREFULLY BEFORE USING THIS SOFTWARE
// =====================================================
//
// This DevForge AI software ("Software") is licensed under the
// DevForge Proprietary License Agreement. By using, copying,
// modifying, or distributing this Software, you agree to be
// bound by the terms of this License Agreement.
//
// COPYRIGHT NOTICE:
// This Software is protected by copyright laws and international
// treaties. Unauthorized copying, distribution, modification,
// reverse engineering, or use of this Software is strictly
// prohibited and may result in civil and criminal penalties.
//
// =====================================================
// GRANT OF LICENSE
// =====================================================
//
// Subject to the terms of this Agreement, DevForge grants you a
// non-exclusive, non-transferable, non-sublicensable license to:
//
// 1. USE the Software for personal or commercial development
// 2. MODIFY the Software for your own internal use
// 3. CREATE derivative works for your own projects
//
// PROVIDED THAT:
// - You retain all copyright notices
// - You do not remove or alter any license headers
// - You do not claim ownership of the original Software
// - You do not distribute the Software or modifications
//
// =====================================================
// RESTRICTIONS
// =====================================================
//
// YOU MAY NOT:
//
// 1. COPY, DISTRIBUTE, or SELL the Software or modifications
// 2. REMOVE or ALTER copyright notices or license headers
// 3. CLAIM ownership or authorship of the Software
// 4. REVERSE ENGINEER the Software
// 5. USE the Software to create competing products
// 6. DISTRIBUTE derivative works based on this Software
// 7. SUBLICENSE the Software to third parties
// 8. USE the Software in violation of applicable laws
//
// =====================================================
// THEME PROTECTION
// =====================================================
//
// The visual design, UI themes, color schemes, animations,
// and overall aesthetic of DevForge AI are proprietary
// and protected by copyright and trade secret laws.
//
// YOU MAY NOT:
// - Copy the visual design or themes
// - Replicate the UI/UX patterns
// - Use the color schemes in other products
// - Copy animations or interaction patterns
// - Create "similar" products based on this design
//
// Violations of these restrictions may result in legal action
// for copyright infringement and trade secret misappropriation.
//
// =====================================================
// INTELLECTUAL PROPERTY
// =====================================================
//
// All rights, title, and interest in and to the Software,
// including without limitation all copyright, patent,
// trademark, trade secret, and other intellectual property
// rights, are and shall remain the exclusive property of
// DevForge.
//
// =====================================================
// DISCLAIMER OF WARRANTY
// =====================================================
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
// KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL DEVFORGE
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// =====================================================
// LIMITATION OF LIABILITY
// =====================================================
//
// IN NO EVENT SHALL DEVFORGE BE LIABLE FOR ANY INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
// GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
// DAMAGE.
//
// =====================================================
// TERMINATION
// =====================================================
//
// This License is effective until terminated. Your rights
// under this License will terminate automatically without
// notice if you fail to comply with any of its terms.
//
// Upon termination, you must immediately cease all use of
// the Software and destroy all copies in your possession.
//
// =====================================================
// GOVERNING LAW
// =====================================================
//
// This Agreement shall be governed by and construed in
// accordance with the laws of the jurisdiction in which
// DevForge is registered, without regard to its conflict
// of law provisions.
//
// =====================================================
// TRADEMARK NOTICE
// =====================================================
//
// DevForge, DevForge AI, VUX AI, and related logos and names
// are trademarks of DevForge. You may not use these trademarks
// without express written permission.
//
// =====================================================
// COMMERCIAL LICENSE
// =====================================================
//
// For commercial redistribution, white-labeling, or OEM
// licensing, contact DevForge for a commercial license.
//
// =====================================================
// CONTACT
// =====================================================
//
// For licensing inquiries, contact:
// licensing@devforge.ai
//
// =====================================================
// END OF LICENSE AGREEMENT
// =====================================================

export interface LicenseInfo {
  type: 'personal' | 'commercial' | 'enterprise';
  valid: boolean;
  expiresAt?: Date;
  features: string[];
  restrictions: string[];
}

export class LicenseManager {
  private licenseKey: string | null = null;
  private licenseInfo: LicenseInfo | null = null;

  constructor() {
    this.licenseKey = process.env.LICENSE_KEY || null;
    this.validateLicense();
  }

  private validateLicense(): void {
    if (!this.licenseKey) {
      // Default to personal license
      this.licenseInfo = {
        type: 'personal',
        valid: true,
        features: [
          'full_ide_features',
          'agent_chat',
          'device_lab',
          'local_ai',
          'workspace_management',
        ],
        restrictions: [
          'no_redistribution',
          'no_commercial_use',
          'no_white_label',
          'attribution_required',
        ],
      };
      return;
    }

    // Validate license key against server
    this.validateWithServer();
  }

  private async validateWithServer(): Promise<void> {
    if (!process.env.LICENSE_SERVER_URL) return;

    try {
      const response = await fetch(process.env.LICENSE_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: this.licenseKey }),
      });

      if (response.ok) {
        this.licenseInfo = await response.json();
      } else {
        this.licenseInfo = { type: 'personal', valid: false, features: [], restrictions: [] };
      }
    } catch {
      // Server validation failed, use local validation
      this.validateLocally();
    }
  }

  private validateLocally(): void {
    // Basic local validation (in production, use proper crypto)
    if (!this.licenseKey || this.licenseKey.length < 32) {
      this.licenseInfo = { type: 'personal', valid: false, features: [], restrictions: [] };
      return;
    }

    this.licenseInfo = {
      type: 'commercial',
      valid: true,
      features: [
        'full_ide_features',
        'agent_chat',
        'device_lab',
        'local_ai',
        'workspace_management',
        'commercial_use',
        'white_label',
        'priority_support',
      ],
      restrictions: ['no_redistribution'],
    };
  }

  getLicenseInfo(): LicenseInfo | null {
    return this.licenseInfo;
  }

  hasFeature(feature: string): boolean {
    return this.licenseInfo?.features.includes(feature) || false;
  }

  isRestricted(restriction: string): boolean {
    return this.licenseInfo?.restrictions.includes(restriction) || false;
  }

  isValid(): boolean {
    return this.licenseInfo?.valid || false;
  }
}

export const licenseManager = new LicenseManager();
