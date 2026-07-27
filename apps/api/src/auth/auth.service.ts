import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email já cadastrado');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      },
    });
    return this.signToken(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Mensagem única para email inexistente e senha errada — não vaza qual dos dois falhou
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    return this.signToken(user.id, user.email, user.name);
  }

  private async signToken(sub: string, email: string, name: string) {
    const token = await this.jwtService.signAsync({ sub, email, name });
    return { token, user: { id: sub, email, name } };
  }
}
