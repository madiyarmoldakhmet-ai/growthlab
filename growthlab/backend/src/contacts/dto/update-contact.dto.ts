import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto implements Partial<CreateContactDto> {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
}
