import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { CodeValidationService } from '../code-validations/code-validation.service';
import { MailerService } from '@nestjs-modules/mailer';
import { AuthProvider } from '../common/enums/provider.enum';
import { UserErrorMessage } from '../common/error-message-base';
import { ParamsPagination } from '@/common/paginations/params-pagination';
import { ImageProcessingService } from '../storage/services/image-processing.service';
import { IStorageService } from '../storage/interfaces/storage.interface';

@Injectable()
export class UserService {
  private link = `${process.env.URL_FRONT}/recuperar-senha/validar-codigo`;
  constructor(
    private readonly repo: UserRepository,
    private mailer: MailerService,
    private codeValidationService: CodeValidationService,
    @Inject('STORAGE_SERVICE') private readonly storageService: IStorageService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    requestBy?: string,
    photo?: Express.Multer.File,
  ): Promise<User> {
    const { email } = createUserDto;
    const existingUser = await this.repo.checkIfExistsEmail(email);
    if (existingUser) {
      throw new ConflictException(UserErrorMessage.EMAIL_ALREADY_IN_USE);
    }

    let photoUrl: string | undefined = createUserDto.photo_url;

    // Processa a imagem se fornecida
    if (photo) {
      const uploadResult = await this.imageProcessingService.processAndUpload(
        photo,
        this.storageService,
        'users',
      );
      photoUrl = uploadResult.url;
    }

    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.repo.save(
      {
        ...createUserDto,
        photo_url: photoUrl,
        provider: createUserDto.provider ? createUserDto.provider : AuthProvider.LOCAL,
        password: hashedPassword,
        isActive: createUserDto.provider ? true : false, // Ativa se provider existir
      },
      requestBy,
    );
    const code = await this.codeValidationService.create(user, true);
    this.mailer.sendMail({
      to: createUserDto.email,
      subject: 'Create account',
      template: './create-account-email-template',
      context: {
        email: user.email,
        name: user.name,
        link: this.link,
        code: code.code,
      },
    });
    return user;
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.repo.findOne(userId);
    if (!user) {
      throw new NotFoundException(UserErrorMessage.NOT_FOUND);
    }
    return user;
  }

  async deleted(id: string, requestBy: string): Promise<boolean> {
    const user = await this.repo.findAndDelete(id, requestBy);
    if (!user) {
      throw new NotFoundException(UserErrorMessage.NOT_FOUND);
    }
    return true;
  }

  async update(
    id: string,
    userData: Partial<User>,
    requestBy?: string,
    photo?: Express.Multer.File,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Processa a nova imagem se fornecida
    if (photo) {
      // Remove a imagem antiga se existir
      if (user.photo_url) {
        try {
          await this.storageService.deleteFile(user.photo_url);
        } catch (error) {
          console.error('Error deleting old photo:', error);
        }
      }

      const uploadResult = await this.imageProcessingService.processAndUpload(
        photo,
        this.storageService,
        'users',
      );
      userData.photo_url = uploadResult.url;
    }

    Object.assign(user, userData);
    const userUpdated = await this.repo.update(id, user, requestBy);

    if (!userUpdated) {
      throw new InternalServerErrorException(UserErrorMessage.NOT_UPDATED);
    }
    return userUpdated;
  }

  async findAll(params: ParamsPagination): Promise<[User[], number]> {
    return await this.repo.findAndCount(params);
  }

  async checkIfExistsEmail(email: string): Promise<boolean> {
    const existingUser = await this.repo.checkIfExistsEmail(email);
    if (existingUser) {
      return true;
    }
    return false;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.repo.findByEmail(email);
    return user;
  }

  async changePassword(password: string, code: string): Promise<User> {
    const userValidation = await this.codeValidationService.validate(code);
    const user = await this.findOne(userValidation.user.id);
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    const userUpdated = await this.update(user.id, user);
    await this.codeValidationService.deleted(user.id);
    return userUpdated;
  }
}
