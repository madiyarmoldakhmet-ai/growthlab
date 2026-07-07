import { CreateCrmContactDto } from './create-crm-contact.dto';

export class UpdateCrmContactDto implements Partial<CreateCrmContactDto> {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
}
